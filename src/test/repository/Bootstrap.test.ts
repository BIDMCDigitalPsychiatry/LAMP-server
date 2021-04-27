import { CredentialModel } from '../../model/Credential'
import { Bootstrap } from '../../repository/Bootstrap'

describe('Bootstrap', () => {
  it('creates an admin credential if one does not exist', async () => {
    await Bootstrap()
    const data = await CredentialModel.find({ origin: null, access_key: "admin" })
    expect(data).toHaveLength(1)
  })
})
