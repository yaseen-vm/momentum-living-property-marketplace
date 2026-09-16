export default {
  async scheduled(_event: ScheduledEvent, _env: unknown, _ctx: ExecutionContext): Promise<void> {
    console.log("Ingestion Worker triggered — v2 feed adapters not yet implemented");
  },
};
