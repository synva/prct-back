import logger from './logger.js'
import moment from 'moment'

class Utils {

  constructor () {
  }

  preciseRound (number) {
    return Math.round(number * 10000) / 10000
  }

}

export default new Utils()
