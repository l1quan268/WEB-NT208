"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RoomTypeImage extends Model {
    static associate(models) {
      RoomTypeImage.belongsTo(models.RoomType, { foreignKey: "room_type_id" });
    }
  }
  RoomTypeImage.init(
    {
      image_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      room_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      image_url: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      alt_text: {
        type: DataTypes.STRING(255),
      },
      is_thumbnail: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      position: {
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize,
      modelName: "RoomTypeImage",
      tableName: "roomtypeimages",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      underscored: true,
    }
  );
  return RoomTypeImage;
};
