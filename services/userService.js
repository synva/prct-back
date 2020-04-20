/* eslint-disable require-atomic-updates */
import logger from './logger.js'
import mongo from './mongo.js'
// import conf from 'config'
// import {ObjectId} from 'mongodb'

class UserService {

  constructor () {
  }

  async recordLogin (user) {
    let now = new Date()
    await mongo.modify('users', {_id: user._id}, {$set: {udate: now.valueOf()}}, {multi: false})
    return await this.findUser(user)
  }

  async addUser (user) {
    logger.info('new user:', user._id)
    let result = await mongo.find('users', {_id: user._id})
    if (result.list.length <= 0) {
      user.role = 2
      user.IRISpan = 100
      user.IRIOverlap = 10
      user.IRIIndex = 0
      user.IRIs = [{
        IRISpan: 100,
        IRIOverlap: 10
      }]
      user.canIri = false
      user.canFlt = false
      user.credit = 0
      user.auto = true
      user.language = 'en'
      user.cuser = user._id
      user.uuser = user._id
      let now = new Date()
      user.cdate = now.valueOf()
      user.udate = now.valueOf()
      return (await mongo.add('users', user)).ops[0]
    } else {
      throw {code: 'B003', detail: null}
    }
  }

  async findUser (user) {
    let result = await mongo.find('users', {_id: user._id, password: user.password})
    if (result.list.length <= 0) {
      throw {code: 'S002', detail: null}
    } else {
      return result.list[0]
    }
  }

  async authenticate (_id, password) {
    let result = await mongo.find('users', {_id: _id, password: password})
    if (result.list.length <= 0) {
      throw {code: 'B000', detail: null}
    } else {
      return result.list[0]
    }
  }

  async modifyUser (user, userInfo) {
    let id = userInfo._id
    delete userInfo._id
    userInfo.uuser = user._id
    let now = new Date()
    userInfo.udate = now.valueOf()
    await mongo.modify('users', {_id: id}, {$set: userInfo}, {multi: false})
    userInfo._id = id
    return userInfo
  }

}

export default new UserService()
