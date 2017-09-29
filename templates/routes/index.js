import Route from '@mirana/fox/dist/routing/Route';

let route = new Route();

route.get('/', (req, res, next) => {
  return res.json({message: 'Hello World'}, 200);
});

export default route;
