import { spawn, Thread, Worker } from 'threads';
import type { Task } from './task';

type Metadata = { id: string };
export class ThreadSupervisor {
  private readonly subscriptions: Record<string, Metadata> = {};
  private readonly tasks: Record<
    string,
    Awaited<ReturnType<typeof spawn<Task>>>
  > = {};
  private state: 'running' | 'stopped' = 'stopped';

  async addRelay(id: string) {
    this.subscriptions[id] = { id };

    if (this.state === 'running') {
      await this.startSubscription(id);
    }
  }

  async removeRelay(id: string) {
    delete this.subscriptions[id];

    if (this.state === 'running') {
      await this.stopSubscription(id);
    }
  }

  async start(): Promise<void> {
    this.state = 'running';

    for (const id of Object.keys(this.subscriptions)) {
      await this.startSubscription(id);
    }
  }

  async end(): Promise<void> {
    for (const id of Object.keys(this.tasks)) {
      await this.stopSubscription(id);
    }

    this.state = 'stopped';
  }

  private async startSubscription(id: string): Promise<void> {
    this.tasks[id] = await spawn<Task>(new Worker('./task'));

    await this.tasks[id].start(this.subscriptions[id]);
  }

  private async stopSubscription(id: string): Promise<void> {
    await this.tasks[id].stop();
    await Thread.terminate(this.tasks[id]);

    delete this.tasks[id];
  }
}
