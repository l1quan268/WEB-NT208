"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RoomTypeService extends Model {
    static associate(models) {
      // Quan hệ đã được định nghĩa trong RoomType và Service
    }
  }
  RoomTypeService.init(
    {
      room_type_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      service_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
    },
    {
      sequelize,
      modelName: "RoomTypeService",
      tableName: "roomtypeservices",
      timestamps: false,
      underscored: true,
    }
  );
  return RoomTypeService;
};
