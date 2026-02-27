module.exports = function(sequelize, DataTypes) {
    var GPermissionLog = sequelize.define('GPermissionLog', {
        resorreq: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'res/req'
        },
        state: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            comment: 'res: [0: 수락, 1: 거절], req: [0: 해제, 1: 연결]',
        },
        text: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '사유서'
        }
    }, {
        tableName: 'cssys_guidance_permissionlog',
        comment: '생활 지도 교수 신청'
    });

    GPermissionLog.associate = function(models) {
        GPermissionLog.belongsTo(models.Prof);
        GPermissionLog.belongsTo(models.Student);
    };

    return GPermissionLog;
};