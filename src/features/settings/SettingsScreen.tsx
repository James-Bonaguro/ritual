import { useRef, useState } from 'react'
import type { Appearance, Backup } from '../../data/types'
import { useStore } from '../../data/store'
import { syncStatus } from '../../data/sync'
import { isConfigured as syncConfigured, sendMagicLink } from '../../data/supabase'
import { DEFAULT_VISIT_TEMPLATE } from '../../domain/flow'
import { Screen } from '../../components/ios/Screen'
import { BackButton } from '../session/SessionScreen'
import { ListRow, ListSection, RowIcon } from '../../components/ios/List'
import { Button, Segmented, TextField } from '../../components/ios/Controls'

export function SettingsScreen({
  onBack,
  onOpenVisitTemplate,
}: {
  onBack: () => void
  onOpenVisitTemplate: () => void
}) {
  const {
    settings,
    saveSettings,
    exportBackup,
    importBackup,
    clearAll,
    sessions,
    movements,
    auth,
    syncNow,
    signOutOfSync,
  } = useStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmingWipe, setConfirmingWipe] = useState(false)
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const download = () => {
    const backup = exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `ritual-backup-${backup.exportedAt.slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Backup saved.')
  }

  const upload = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      // Validate the shape before wiping what's already there — an import that
      // silently destroys a year of history would be unforgivable.
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !Array.isArray((parsed as Backup).sessions) ||
        !Array.isArray((parsed as Backup).movements)
      ) {
        setMessage("That file doesn't look like a Ritual backup.")
        return
      }
      await importBackup(parsed as Backup)
      setMessage('Backup restored.')
    } catch {
      setMessage("Couldn't read that file.")
    }
  }

  const sync = syncStatus()

  const sendLink = async () => {
    try {
      await sendMagicLink(email)
      setLinkSent(true)
      setMessage(`Check ${email} for a sign-in link.`)
    } catch {
      setMessage("Couldn't send that link. Check the address and try again.")
    }
  }

  const doSync = async () => {
    setSyncing(true)
    try {
      const result = await syncNow()
      setMessage(`Synced — ${result.pulled} pulled, ${result.pushed} pushed.`)
    } catch {
      setMessage("Couldn't sync — check your connection and try again.")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Screen title="Settings" leading={<BackButton onClick={onBack} />}>
      <ListSection header="Appearance">
        <div style={{ padding: '12px 0' }}>
          <Segmented<Appearance>
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={settings.appearance}
            onChange={(appearance) => void saveSettings({ ...settings, appearance })}
            style={{ margin: 0 }}
          />
        </div>
      </ListSection>

      <ListSection
        header="Your visit"
        separatorInset={57}
      >
        <ListRow
          title="Usual visit"
          value={`${settings.visitTemplate.length} steps`}
          leading={<RowIcon name="stretch" tint="var(--accent-mobility)" />}
          onClick={onOpenVisitTemplate}
          chevron
        />
      </ListSection>

      <ListSection
        header="Sync"
        footer={
          !syncConfigured()
            ? sync.detail
            : auth
              ? `Signed in as ${auth.user.email ?? auth.user.id}.`
              : linkSent
                ? "Tap the link in that email on this device to finish signing in — it'll open right back here."
                : sync.detail
        }
        separatorInset={57}
      >
        <ListRow
          title="Cross-device sync"
          value={auth ? 'Signed in' : sync.label}
          leading={<RowIcon name="vibration-plate" tint="var(--blue)" />}
        />
        {syncConfigured() && !auth ? (
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
            <TextField
              value={email}
              onChange={setEmail}
              placeholder="you@email.com"
              inputMode="email"
              ariaLabel="Email for sign-in link"
              onSubmit={() => void sendLink()}
            />
            <Button small onClick={() => void sendLink()}>
              {linkSent ? 'Resend' : 'Send link'}
            </Button>
          </div>
        ) : null}
        {syncConfigured() && auth ? (
          <>
            <ListRow
              title={syncing ? 'Syncing…' : 'Sync now'}
              onClick={syncing ? undefined : () => void doSync()}
              centered
            />
            <ListRow title="Sign out of sync" destructive centered onClick={() => void signOutOfSync()} />
          </>
        ) : null}
      </ListSection>

      <ListSection
        header="Backup"
        separatorInset={57}
      >
        <ListRow
          title="Export backup"
          subtitle={`${sessions.length} sessions · ${movements.length} movements`}
          leading={<RowIcon name="history" tint="var(--green)" />}
          onClick={download}
        />
        <ListRow
          title="Import backup"
          subtitle="Replaces everything currently stored"
          leading={<RowIcon name="plus" tint="var(--orange)" />}
          onClick={() => fileInput.current?.click()}
        />
      </ListSection>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />

      {message ? (
        <ListSection tight>
          <ListRow title={message} />
        </ListSection>
      ) : null}

      <ListSection
        header="Danger"
        footer="Erasing is immediate and cannot be undone. Export first."
      >
        {confirmingWipe ? (
          <>
            <ListRow
              title="Erase everything, permanently"
              destructive
              onClick={() => {
                void clearAll()
                setConfirmingWipe(false)
                setMessage('All data erased.')
              }}
              centered
            />
            <ListRow title="Cancel" onClick={() => setConfirmingWipe(false)} centered />
          </>
        ) : (
          <ListRow title="Erase all data" destructive centered onClick={() => setConfirmingWipe(true)} />
        )}
      </ListSection>

      <ListSection tight>
        <ListRow title="Version" value="0.1.0" />
      </ListSection>
    </Screen>
  )
}

export function VisitTemplateScreen({ onBack }: { onBack: () => void }) {
  const { settings, saveSettings } = useStore()
  const template = settings.visitTemplate

  const move = (index: number, delta: number) => {
    const next = [...template]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    void saveSettings({ ...settings, visitTemplate: next })
  }

  const remove = (index: number) =>
    void saveSettings({ ...settings, visitTemplate: template.filter((_, i) => i !== index) })

  return (
    <Screen
      title="Usual visit"
      leading={<BackButton onClick={onBack} />}
      subtitle="Prefilled into every new session"
    >
      <ListSection
        header="Steps">
        {template.map((step, index) => (
          <ListRow
            key={`${step.kind}-${index}`}
            title={step.label}
            trailing={
              <span style={{ display: 'flex', gap: 2 }}>
                <Button variant="plain" small onClick={() => move(index, -1)}>
                  ↑
                </Button>
                <Button variant="plain" small onClick={() => move(index, 1)}>
                  ↓
                </Button>
                <Button variant="plain" small destructive onClick={() => remove(index)}>
                  Remove
                </Button>
              </span>
            }
          />
        ))}
      </ListSection>

      <ListSection tight>
        <ListRow
          title="Reset to the default visit"
          centered
          onClick={() => void saveSettings({ ...settings, visitTemplate: DEFAULT_VISIT_TEMPLATE })}
        />
      </ListSection>
    </Screen>
  )
}
