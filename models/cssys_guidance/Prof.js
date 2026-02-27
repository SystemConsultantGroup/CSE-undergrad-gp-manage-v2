module.exports = function(sequelize, DataTypes) {
    var Prof = sequelize.define('Prof', {
    }, {
        tableName: 'cssys_work_prof'
    });

    Prof.associate = function(models) {
        Prof.belongsTo(models.User);
        Prof.hasMany(models.Student);
    };

    return Prof;
};