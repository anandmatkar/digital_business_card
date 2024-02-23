const db_sql = {
    Q0: `SELECT id,name,email,password,avatar FROM super_admin WHERE  deleted_at IS NULL`,
    Q1: `SELECT id,name,email,password,avatar FROM super_admin WHERE email = '{var1}' AND deleted_at IS NULL`,
    Q2: `INSERT INTO super_admin (name,email,password,avatar) VALUES ('{var1}', '{var2}', '{var3}','{var4}') RETURNING *;`,
    Q3: `SELECT id,name,email,avatar FROM super_admin WHERE id = '{var1}' AND deleted_at IS NULL`,
    Q4: `UPDATE super_admin SET password = '{var1}' ,updated_at = '{var2}' WHERE id = '{var3}' AND deleted_at IS NULL RETURNING *`,
    Q5: `SELECT * FROM company WHERE company_name = '{var1}' OR company_email = '{var2}' AND deleted_at IS NULL`,
    Q6: `INSERT INTO company (company_name,company_email,company_contact_number, max_cards, contact_person_name,contact_person_email, company_logo) VALUES('{var1}','{var2}','{var3}','{var4}','{var5}','{var6}', '{var7}') RETURNING *`,
    Q7: `SELECT * FROM company WHERE deleted_at IS NULL AND status = '{var1}'`,
    Q8: `SELECT * FROM company WHERE id = '{var1}' AND deleted_at IS NULL`,
    Q9: `INSERT INTO company_admin (first_name, last_name, email, password, mobile_number, company_id, created_by, role, avatar, company_name) VALUES ('{var1}','{var2}','{var3}','{var4}', '{var5}', '{var6}', '{var7}', '{var8}', '{var9}','{var10}') RETURNING *`,
    Q10: `SELECT * FROM company_admin WHERE company_id = '{var1}' AND deleted_at IS NULL`,
    Q11: `SELECT 
                c.id, 
                c.company_name, 
                c.company_email, 
                c.description, 
                c.company_address, 
                c.company_logo, 
                c.company_contact_number,
                c.company_website, 
                c.status, 
                c.max_cards,
                c.used_cards, 
                c.contact_person_name, 
                c.contact_person_designation,
                c.contact_person_email, 
                c.contact_person_mobile, 
                c.location, 
                c.latitude, 
                c.longitude, 
                c.created_at, 
                c.updated_at, 
                c.deleted_at,
                COALESCE(json_agg(json_build_object(
                    'company_admin_id', ca.id,
                    'first_name', ca.first_name,
                    'last_name', ca.last_name,
                    'email', ca.email,
                    'phone_number', ca.phone_number,
                    'mobile_number', ca.mobile_number,
                    'company_id', ca.company_id,
                    'created_by', ca.created_by,
                    'role', ca.role,
                    'is_active', ca.is_active,
                    'avatar', ca.avatar,
                    'created_at', ca.created_at,
                    'updated_at', ca.updated_at,
                    'deleted_at', ca.deleted_at
                )), '[]') AS company_admin_data
            FROM 
                company AS c 
            LEFT JOIN 
                company_admin AS ca ON c.id = ca.company_id AND ca.deleted_at IS NULL
            WHERE 
                c.id = '{var1}' 
                AND c.deleted_at IS NULL
            GROUP BY 
                c.id;`,
    Q12: `UPDATE company SET company_name = '{var1}', company_email = '{var2}', company_contact_number = '{var3}', max_cards = '{var4}', 
    contact_person_name = '{var5}', contact_person_email = '{var6}', description = '{var7}', company_address = '{var8}',company_logo = '{var9}', company_website = '{var10}', contact_person_designation = '{var11}', contact_person_mobile = '{var12}', latitude = '{var13}', longitude = '{var14}' WHERE id = '{var15}' AND deleted_at IS NULL RETURNING *`


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
