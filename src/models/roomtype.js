"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RoomType extends Model {
    static associate(models) {
      RoomType.belongsTo(models.Homestay, { foreignKey: "homestay_id" });
      RoomType.hasMany(models.Booking, { foreignKey: "room_type_id" });
      RoomType.hasMany(models.RoomTypeImage, { foreignKey: "room_type_id" });
      RoomType.belongsToMany(models.Service, {
        through: models.RoomTypeService,
        foreignKey: "room_type_id",
      });
      RoomType.hasMany(models.Review, { foreignKey: "room_type_id" });
    }
  }
  RoomType.init(
    {
      room_type_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      homestay_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "Homestays",
          key: "homestay_id",
        },
      },
      type_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      bedroom_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      toilet_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      max_adults: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      max_children: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      max_guests: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      min_adults: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      price_per_night: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RoomType",
      tableName: "roomtypes",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      underscored: true,
    }
  );
  return RoomType;
};
