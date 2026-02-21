module.exports = function(sequelize, DataTypes) {
    var Share = sequelize.define('Share', {
        display: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        title: { // 오버라이드 속성
            type: DataTypes.STRING,
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
        time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        ip: {
            type: DataTypes.STRING(127),
            allowNull: false
        }
    }, {
        tableName: 'cssys_schedule_share',
        comment: '일정관리시스템 공유 정보',
        classMethods: {
            associate: function(models) {
                Share.belongsTo(models.User);
                Share.belongsTo(models.Calendar);
                Share.hasMany(models.Post);
            }
        }
    });
    return Share;
};