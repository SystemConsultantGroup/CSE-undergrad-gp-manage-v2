module.exports = function(sequelize, DataTypes) {
    var AdmMember = sequelize.define("AdmMember", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        position: {
            type: DataTypes.STRING,
            defaultValue: ""
        },
        phone: {
            type: DataTypes.STRING,
            defaultValue: ""
        },
        email: {
            type: DataTypes.STRING,
            defaultValue: ""
        },
        comment: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'cs_adm_mebmer',
        comment: "cs 행정실 업무분장"
    });
    return AdmMember;
};