module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "dish",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: false,
      },
      price: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        allowNull: false,
      },
      allergens: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      co2: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: false,
      },
      h2o: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: false,
      },
      ampel: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: false,
      },
    },
    {
      timestamps: false,
    }
  );
};
