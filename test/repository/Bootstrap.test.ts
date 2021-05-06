import { Bootstrap, MongoClientDB } from '../../src/repository/Bootstrap'

describe('Bootstrap', () => {
  it('creates an admin credential if one does not exist', async () => {
    await Bootstrap()
    const data = await MongoClientDB.collection('credential').find({ 
        _deleted: false,
        origin: null, 
        access_key: 'admin' 
    }).maxTimeMS(60000).toArray()
    expect(data).toHaveLength(1)
  })
})
