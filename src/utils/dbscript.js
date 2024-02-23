const db_sql = {
    Q0: `SELECT id,name,email,password,avatar FROM super_admin WHERE  deleted_at IS NULL`,
    Q1: `SELECT id,name,email,password,avatar FROM super_admin WHERE email = '{var1}' AND deleted_at IS NULL`,
    Q3: `INSERT INTO super_admin (name,email,password,avatar) VALUES ('{var1}', '{var2}', '{var3}','{var4}') RETURNING *;`,
    Q4: `SELECT id,name,email,avatar FROM super_admin WHERE id = '{var1}' AND deleted_at IS NULL`,
};

function dbScript(template, variables) {
    if (variables != null && Object.keys(variables).length > 0) {
        template = template.replace(new RegExp("\{([^\{]+)\}", "g"), (_unused, varName) => {
            return variables[varName];
        });
    }
    template = template.replace(/'null'/g, null);
    return template
}

module.exports = { db_sql, dbScript };
