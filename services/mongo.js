import conf from 'config'
import mongodb from 'mongodb'
const MongoClient = mongodb.MongoClient

class Mongo {
  constructor () {
  }
  async init () {
    let that = this
    this.db = null
    const str = 'mongodb://' + conf.mongo.user + ':' + conf.mongo.password + '@' + conf.mongo.server + ':' + conf.mongo.port + '/' + conf.mongo.db
    let client = await MongoClient.connect(str, {useNewUrlParser: true, useUnifiedTopology: true}).catch(error => {
      throw JSON.stringify(error)
    })
    that.db = client.db(conf.mongo.db)
  }
  async find (collection_name, criteria, projection, sort, pageIndex) {
    if (typeof(criteria) === 'function') {
      criteria = {}
      projection = null
      sort = null
    } else if (typeof(projection) === 'function') {
      projection = null
      sort = null
    } else if (typeof(sort) === 'function') {
      sort = null
    }
    let skip = 0
    let limit = conf.mongo.limit
    if (pageIndex > 0) {
      skip = pageIndex * limit
    }
    let collection = null
    try {
      collection = this.db.collection(collection_name)
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
    let cursor = null
    try {
      cursor = await collection.find(criteria)
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
    if (projection) {
      cursor = cursor.project(projection)
    }
    if (sort) {
      cursor = cursor.sort(sort)
    }
    let count = null
    try {
      count = await cursor.count()
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
    let list = null
    try {
      list = await cursor.skip(skip).limit(limit).toArray()
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
    let totalPage = Math.ceil(count / conf.mongo.limit)
    if (list.length <= 0) {
      list = []
      count = 0
      totalPage = 0
    }
    return {list, count, totalPage}
  }
  async findAll (collection_name, criteria, projection, sort) {
    if (typeof(criteria) === 'function') {
      criteria = {}
      projection = null
      sort = null
    } else if (typeof(projection) === 'function') {
      projection = null
      sort = null
    } else if (typeof(sort) === 'function') {
      sort = null
    }
    let collection = null
    try {
      collection = this.db.collection(collection_name)
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
    let cursor = null
    try {
      cursor = await collection.find(criteria)
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
    if (projection) {
      cursor = cursor.project(projection)
    }
    if (sort) {
      cursor = cursor.sort(sort)
    }
    let result = await cursor.toArray()
    if (result.length <= 0) {
      return []
    } else {
      return result
    }
  }
  async add (collection_name, document, options) {
    let collection = null
    try {
      collection = this.db.collection(collection_name)
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
    let result = null
    try {
      result = await collection.insertOne(document, options)
      return result
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
  }
  async modify (collection_name, query, update, options) {
    let collection = null
    try {
      collection = this.db.collection(collection_name)
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
    let result = null
    try {
      result = await collection.updateOne(query, update, options)
      return result
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
  }
  async remove (collection_name, query, options) {
    let collection = null
    try {
      collection = this.db.collection(collection_name)
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
    let result = null
    try {
      result = await collection.deleteOne(query, options)
      return result
    } catch (error) {
      throw {code: 'S003', detail: JSON.stringify(error)}
    }
  }
}
export default new Mongo()
