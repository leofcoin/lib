import Block from './block'
import Chain from './chain'
import Errors from './errors'
import Hash from './hash'
import Transaction from './transaction'
import Validator from './validate'
import * as  params from './params'

const hash = new Hash()
const errors = new Errors()
const validate = new Validator()
const transaction = new Transaction()
const chain = new Chain()
const block = new Block()

export {
  block,
  chain,
  errors,
  hash,
  params,
  transaction,
  validate
}
