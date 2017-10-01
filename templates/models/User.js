import {database} from '@mirana/fox';

/**
 *
 * @extends database.Model
 */
class User extends database.Model {
  static schema = {
    email: String,
    password: String,
    deleted_at: {type: Date, default: Date.now},
  };
}

export default (new User);
