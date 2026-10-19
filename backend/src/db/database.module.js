import { Global, Module } from "@nestjs/common";
import { closeDatabase, DATABASE, getDatabase } from "./database.js";

class DatabaseLifecycle {
  async onModuleDestroy() {
    await closeDatabase();
  }
}

class DatabaseModule {}

Global()(DatabaseModule);
Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => getDatabase(),
    },
    DatabaseLifecycle,
  ],
  exports: [DATABASE],
})(DatabaseModule);

export default DatabaseModule;
