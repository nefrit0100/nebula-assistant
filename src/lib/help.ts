/** Help content shared by Settings → Help and the public docs page. */

export type HelpItem = { q: string; a: string }

export const TROUBLESHOOTING: HelpItem[] = [
  {
    q: "My API key is rejected",
    a: "Check that you copied the whole key with no spaces, that it hasn't been revoked, and — for Alibaba Cloud and Zhipu — that the region or platform matches where the key was created. Use Test on the provider card to check again.",
  },
  {
    q: "A reply stopped partway",
    a: "Either you pressed stop, the connection dropped, or the model reached its length limit. Use Continue under the reply to pick up where it left off, or Regenerate to start over.",
  },
  {
    q: "A model I expect isn't listed",
    a: "Nebula lists the models your key can access, as reported by the provider. New models can take a few minutes to appear; reopen the model menu to refresh. Some accounts need extra verification with the provider before certain models are available.",
  },
  {
    q: "I'm seeing rate-limit or quota errors",
    a: "Those limits come from your provider account. Wait a moment, choose another model, or raise your limits or balance in the provider's console.",
  },
  {
    q: "Who can read my conversations?",
    a: "Other Nebula accounts can't: the database only returns your own records. The operator of this Nebula deployment runs the server and database and can technically access stored data. The provider you choose processes each message to generate a reply, under its own privacy policy. See Settings → Privacy and data for details.",
  },
]

export const SIGN_IN_HELP: HelpItem[] = [
  {
    q: "The confirmation email didn't arrive",
    a: "Check your spam or junk folder. On the \"Check your inbox\" screen you can send the link again, or go back and correct the address.",
  },
  {
    q: "The link says it's invalid or expired",
    a: "Links work once and expire after a while. Request a new one: sign up again with the same address to get a new confirmation link, or use \"Forgot password?\" for a new reset link.",
  },
  {
    q: "The link asks me to sign in again",
    a: "Open the link in the same browser you signed up or requested it from. Otherwise, sign in with your email and password.",
  },
  {
    q: "I forgot my password",
    a: "Choose \"Forgot password?\" on the sign-in page and enter your email address. You'll get a link to set a new one.",
  },
  {
    q: "It says there were too many attempts, or that no more emails can be sent",
    a: "Sign-in and email requests are rate-limited to stop abuse. After a short wait you can try again; you can request another email for the same address about once a minute. If Nebula has reached its hourly email limit, try again later.",
  },
]

/** Keyboard shortcuts; `mod` is "⌘" on Apple platforms and "Ctrl" elsewhere. */
export function shortcutList(mod: string) {
  return [
    { keys: [mod, "K"], label: "Search conversations" },
    { keys: [mod, "Shift", "O"], label: "New chat" },
    { keys: [mod, "Shift", "S"], label: "Collapse or expand the sidebar" },
    { keys: ["Shift", "Esc"], label: "Focus the message box" },
    { keys: ["Enter"], label: "Send message" },
    { keys: ["Shift", "Enter"], label: "New line" },
    { keys: ["Esc"], label: "Close a menu or dialog" },
  ]
}
