import grpc from 'k6/net/grpc';
import { check, sleep } from 'k6';
import encoding from 'k6/encoding';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const client = new grpc.Client();
client.load(['..'], 'api/v1/store.proto');

export const options = {
    scenarios: {
        writing_events: {
            // In essence, we do 200 writes with 10 concurrent requests.
            executor: 'shared-iterations',
            vus: 100,
            iterations: 20000,
            maxDuration: '30s',
        },
    },
};

export default () => {
    if (__ITER == 0) {
        client.connect('localhost:8080', {
            plaintext: true,
        });
    }

    const response = client.invoke('fossil.Writer/AppendEvent', {
        stream_name: 'Foo/Bar/'+uuidv4(),
        event_id: '123',
        event_type: 'Foo',
        payload: encoding.b64encode("Hello World"),
    });

    check(response, {
        'status is OK': (r) => r && r.status === grpc.StatusOK,
    });
};