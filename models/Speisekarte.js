module.exports = (sequelize, DataTypes) => {
  return sequelize.define("speisekarte", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: DataTypes.STRING,
    preis: {
      type: DataTypes.INTEGER,
      allowNull: false,
      default: 0,
    },
    beschreibung: DataTypes.STRING,
    allergene: DataTypes.STRING,
  });
};
