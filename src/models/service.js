"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Service extends Model {
    static associate(models) {
      Service.belongsToMany(models.RoomType, {
        through: models.RoomTypeService,
        foreignKey: "service_id",
      });

      Service.belongsToMany(models.Booking, {
        through: models.BookingService,
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
      base_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "Service",
      tableName: "services",
      timestamps: false,
      underscored: true,       
    }
  );

  return Service;
};
