"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BookingService extends Model {
    static associate(models) {
      BookingService.belongsTo(models.Booking, { foreignKey: "booking_id" });
      BookingService.belongsTo(models.Service, { foreignKey: "service_id" });
    }
  }

  BookingService.init(
    {
      booking_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      service_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "BookingService",
      tableName: "booking_services",   
      timestamps: false,
      underscored: true,
    }
  );

  return BookingService;
};
