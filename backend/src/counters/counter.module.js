import { Module } from "@nestjs/common";
import { CounterService } from "./counter.service.js";

class CounterModule {}

Module({ providers: [CounterService], exports: [CounterService] })(
  CounterModule,
);

export default CounterModule;
