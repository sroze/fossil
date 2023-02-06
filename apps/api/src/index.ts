import { createServer } from "./server";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const port = process.env.PORT || 5001;
const server = createServer();

server.listen(port, () => {
  console.log(`api running on ${port}`);
});
