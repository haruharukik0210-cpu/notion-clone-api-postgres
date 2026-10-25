import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	OneToMany,
	Index,
} from "typeorm";
import { User } from "../users/user.entity";

@Entity("notes")
export class Note {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	userId: string;

	@ManyToOne(() => User, (user) => user.notes, { onDelete: "CASCADE" })
	@Index()
	user: User;

	@Column({ nullable: true })
	title?: string;

	@Column("text", { nullable: true })
	content?: string;

	@Column({ nullable: true })
	parentId?: number | null;

	@Column({
		nullable: false,
		default: false,
	})
	isArchived: boolean;

	@ManyToOne(() => Note, (note) => note.children, {
		onDelete: "CASCADE",
		nullable: true,
	})
	@Index()
	parent?: Note;

	@OneToMany(() => Note, (note) => note.parent)
	children?: Note[];

	@CreateDateColumn()
	@Index()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
