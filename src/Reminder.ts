import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "@sequelize/core";
import { Attribute, PrimaryKey, AutoIncrement, NotNull, Table, Index } from "@sequelize/core/decorators-legacy";

@Table
class Reminder extends Model<InferAttributes<Reminder>, InferCreationAttributes<Reminder>> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    @NotNull
    declare id: CreationOptional<number>;

    @Attribute(DataTypes.DATE)
    @NotNull
    declare date: Date;

    @Attribute(DataTypes.INTEGER)
    @NotNull
    @Index
    declare messageId: number;

    @Attribute(DataTypes.INTEGER)
    @NotNull
    @Index
    declare chatId: number;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export default Reminder;
