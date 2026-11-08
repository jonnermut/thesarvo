/** The committee's address, copied in on every steward note. */
export const COMMITTEE_EMAIL = 'cct@climbersclubtas.org.au'

const Mail = ({ to }: { to: string }) => (
  <a href={`mailto:${to}`} className="text-link underline">
    {to}
  </a>
)

/** The standard Crag Steward text, with this crag's steward address in it (`Header.stewardEmail`). */
export function StewardNote({ email }: { email: string }) {
  return (
    <div className="space-y-2.5">
      <p>
        Rock climbers please contact the Cliff Steward (<Mail to={email} />) if you have any queries or concerns regarding social or environmental impacts of rock climbing at this crag. Do not email regarding general travel, seasonal advice, or lost property - this is not the Steward’s role. If you have important safety information to communicate (e.g. risks due to recent and large rock falls) please also consider updates on thesarvo forum, facebook group and/or online guidebooks as appropriate. Please copy in <Mail to={COMMITTEE_EMAIL} /> if you feel you have a high level concern which may imminently impact the crag or climbing community.
      </p>
      <p>
        Non-climbers, other users, land managers: please also contact <Mail to={COMMITTEE_EMAIL} /> if you have important climbing related queries at this location.
      </p>
    </div>
  )
}
