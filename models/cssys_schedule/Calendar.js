module.exports = function(sequelize, DataTypes) {
    var Calendar = sequelize.define('Calendar', {
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        bgcolor: {
            type: DataTypes.STRING(7),
            allowNull: false,
            defaultValue: '#68b828'
        },
        fontcolor: {
            type: DataTypes.STRING(7),
            allowNull: false,
            defaultValue: '#ffffff'
        },
        comment: {
            type: DataTypes.STRING,
            defaultValue: ''
        },
        time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        ip: {
            type: DataTypes.STRING(127),
            allowNull: false
        }
    }, {
        tableName: 'cssys_schedule_calendar',
        comment: '일정관리시스템 캘린더 정보',
        classMethods: {
            associate: function(models) {
                Calendar.belongsTo(models.User);
                Calendar.hasMany(models.Share);
                Calendar.hasMany(models.Post);
            }
        }
    });
    return Calendar;
};