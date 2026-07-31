import { Module } from '@nestjs/common';
import { FilmCodesController } from './film-codes.controller';
import { FilmCodesService } from './film-codes.service';

@Module({
  controllers: [FilmCodesController],
  providers: [FilmCodesService],
})
export class FilmCodesModule {}
