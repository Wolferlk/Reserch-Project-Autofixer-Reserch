import { MongoClient } from 'mongodb'

const options = {}

declare global {
  // eslint-disable-next-line no-var
  var _mongodbClient: MongoClient | undefined
  // eslint-disable-next-line no-var
  var _mongodbClientPromise: Promise<MongoClient> | undefined
}

export function getMongoClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is not set')
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongodbClient) {
      global._mongodbClient = new MongoClient(uri, options)
    }

    if (!global._mongodbClientPromise) {
      global._mongodbClientPromise = global._mongodbClient.connect()
    }

    return global._mongodbClientPromise
  }

  const client = new MongoClient(uri, options)
  return client.connect()
}
