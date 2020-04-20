import express from 'express'
import url from 'url'
import logger from '../services/logger.js'
// import uuid from 'uuid'

// import utils from '../services/utils.js'
// import userService from '../services/userService.js'

let router = express.Router()

/**
 * sample
 */
router.get('/getData', (req, res) => {
  const params = url.parse(req.url, true).query
  logger.debug('getData:', JSON.stringify(params))

  if (req.session && req.session.passport && req.session.passport.user) {
    logger.debug('user:', req.session.passport.user._id)
  }

  res.json({error: null, data: {col: 'private get data ok'}})
})

router.post('/postData', (req, res) => {
  logger.info('postData:', JSON.stringify(req.body))

  if (req.session && req.session.passport && req.session.passport.user) {
    logger.debug('user:', req.session.passport.user._id)
  }

  res.json({error: null, data: {col: 'private post data ok'}})
})

module.exports = router
