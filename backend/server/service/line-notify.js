const bent = require('bent');
const querystring = require('querystring');
const db = require('./db');

const send = async (message, depart) => {
  try {
    const token = await db.one('SELECT depart_line_token FROM depart WHERE depart_id = $1', depart)
    if (token.depart_line_token) {
      const response = await sendWithToken(message, token.depart_line_token)
      return response
    } else {
      return null
    }
  } catch (error) {
    throw error
  }
}

const sendWithToken = async (message, token) => {
  try {
    const header = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Bearer ' + token
    }
    const post = bent('POST', 200)
    const body = querystring.stringify({ message: message })
    const response = await post('https://notify-api.line.me/api/notify', body, header);
    return response
  } catch (error) {
    throw error
  }
}

module.exports = { send, sendWithToken }