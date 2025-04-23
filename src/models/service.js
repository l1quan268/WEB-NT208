"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Service extends Model {
    static associate(models) {
      Service.belongsToMany(models.RoomType, {
        through: models.RoomTypeService,
        foreignKey: "service_id",
      });
    }
  }
  Service.init(
    {
      service_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      service_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Service",
      tableName: "services",
      timestamps: false,
    }
  );
  return Service;
};
