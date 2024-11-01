import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('status')
export class StatusEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
