import type { TestApplication } from './test-application';

export function requestOptionsFromApp(app: TestApplication) {
  const server = app.getHttpServer();
  if (!server.address()) {
    server.listen(0);
  }

  const { port } = server.address();

  return {
    hostname: 'localhost',
    port,
  };
}
