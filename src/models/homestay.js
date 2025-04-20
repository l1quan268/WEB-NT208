"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Homestay extends Model {
    static associate(models) {
      Homestay.hasMany(models.RoomType, { foreignKey: "homestay_id" });
      Homestay.hasMany(models.Booking, { foreignKey: "homestay_id" });
      Homestay.hasMany(models.Review, { foreignKey: "homestay_id" });
    }
  }
  Homestay.init(
    {
      homestay_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      thumbnail_url: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Homestay",
      tableName: "homestays",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );
  return Homestay;
};
