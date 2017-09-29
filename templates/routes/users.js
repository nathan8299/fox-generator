import User from './../models/User';
import Route from '@mirana/fox/dist/routing/Route';

let route = new Route();

route.get('/users', (req, res, next) => {
  User.find((err, users) => {
    if (err) return res.json({message: 'Internal Server Error'}, 500);
    return res.json({users});
  });
});

export default route;
