export type WorkerDuty = 'RESTOCK' | 'CHECKOUT' | 'CLEAN' | 'NONE'

export interface HiredWorker {
  instanceId: string;
  dataId: string;
  duty: WorkerDuty;
  targetDeskId?: string | null;
  /**
   * Status for Phaser visuals
   */
  x: number;
  y: number;
  state: 'IDLE' | 'WORKING' | 'MOVING';
}
