import * as  block from './block'
import Chain from './chain'
import Errors from './errors'
import Hash from './hash'
import * as  params from './params'
import Transaction from './transaction'
import Validator from './validate'

const hash = new Hash()
const errors = new Errors()
const validate = new Validator()
const transaction = new Transaction()
const chain = new Chain()

export {
  block,
  chain,
  errors,
  hash,
  params,
  transaction,
  validate
}
