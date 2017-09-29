import Model from '@mirana/fox/dist/database/Model';

/**
 *
 * @extends Model
 */
class User extends Model {
  static schema = {
    email: String,
    password: String,
    deleted_at: {type: Date, default: Date.now},
  };
}

export default (new User);
