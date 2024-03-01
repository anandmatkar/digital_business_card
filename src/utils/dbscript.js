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
    contact_person_name = '{var5}', contact_person_email = '{var6}', description = '{var7}', company_address = '{var8}',company_logo = '{var9}', company_website = '{var10}', contact_person_designation = '{var11}', contact_person_mobile = '{var12}', latitude = '{var13}', longitude = '{var14}' WHERE id = '{var15}' AND deleted_at IS NULL RETURNING *`,
    Q13: `UPDATE company SET status = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *;`,
    Q14: `UPDATE company SET admin_id = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *;`,
    Q15: `UPDATE company_admin SET is_active = '{var1}' WHERE company_id = '{var2}' AND deleted_at IS NULL RETURNING *;`,
    Q16: `SELECT 
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
                c.admin_id = '{var1}' 
                AND c.deleted_at IS NULL
            GROUP BY 
                c.id;`,
    Q17: `INSERT INTO digital_cards (company_id, created_by, card_reference, first_name, last_name,user_email, designation,bio,qr_url, user_type,cover_pic,profile_picture,card_url,vcf_card_url,company_ref, contact_number ) VALUES('{var1}','{var2}','{var3}','{var4}','{var5}','{var6}','{var7}','{var8}','{var9}','{var10}','{var11}','{var12}','{var13}','{var14}', '{var15}','{var16}') RETURNING *`,
    Q18: `INSERT INTO user_media_link (facebook, instagram, extra_link_title, extra_link_url,linkedin,twitter,telegram,whatsapp, youtube,tiktok,line,we_chat,xiao_hong_shu,weibo, digital_card_id) VALUES('{var1}','{var2}','{var3}','{var4}','{var5}','{var6}','{var7}','{var8}','{var9}','{var10}','{var11}','{var12}','{var13}','{var14}','{var15}') RETURNING *`,
    Q19: `SELECT dc.*,
          c.company_name,c.company_email,c.company_address,c.company_logo,c.company_contact_number,c.company_website,c.location, 
          usm.facebook, usm.instagram, usm.extra_link_title, usm.extra_link_url, usm.whatsapp
        FROM digital_cards dc
          LEFT JOIN company c on c.id = dc.company_id 
          LEFT JOIN user_media_link usm ON usm.digital_card_id = dc.id
        WHERE dc.company_ref = '{var1}' AND dc.card_reference = '{var2}' AND dc.is_deactivated = '{var3}' 
          AND dc.deleted_at IS NULL AND c.deleted_at IS NULL AND c.status = 'activated'`,
    Q20: `UPDATE company SET used_cards = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
    Q21: `UPDATE digital_cards SET is_active_for_qr = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
    Q22: `UPDATE digital_cards SET is_deactivated = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
    Q23: `SELECT id,company_id,created_by,card_reference,first_name,last_name,user_email,designation,bio,user_type,cover_pic,profile_picture,is_deactivated, card_url,company_ref,contact_number,is_active_for_qr FROM digital_cards WHERE created_by = '{var1}' AND deleted_at IS NULL`,
    Q24: `UPDATE digital_cards SET is_active_for_qr = '{var1}' WHERE id IN ('{var2}') AND deleted_at IS NULL RETURNING *`,
    Q25: `SELECT id,company_id,created_by,card_reference,first_name,last_name,user_email,designation,bio,user_type,cover_pic,profile_picture,is_deactivated, card_url,company_ref,contact_number,is_active_for_qr FROM digital_cards WHERE id = '{var1}' AND deleted_at IS NULL`,
    Q26: `UPDATE digital_cards SET first_name = '{var1}', last_name = '{var2}',user_email = '{var3}',designation = '{var4}',profile_picture = '{var5}', bio = '{var6}', cover_pic = '{var7}', contact_number = '{var8}' WHERE id = '{var9}' AND deleted_at IS NULL RETURNING *`,
    Q27: `UPDATE company SET company_name = '{var1}', company_email = '{var2}',description = '{var3}', company_address = '{var4}', company_logo = '{var5}', company_website = '{var6}', location = '{var7}', latitude = '{var8}', longitude = '{var9}', company_contact_number = '{var10}' WHERE admin_id = '{var11}' AND id = '{var12}' AND deleted_at IS NULL RETURNING *`,
    Q28: `UPDATE company_admin SET first_name = '{var1}' , last_name = '{var2}', email = '{var3}', phone_number = '{var4}' WHERE id = '{var5}' AND deleted_at IS NULL RETURNING *`,
    Q29: `SELECT id,company_id,created_by,card_reference,first_name,last_name,user_email,designation,bio,user_type,cover_pic,profile_picture,is_deactivated, card_url,company_ref,contact_number,is_active_for_qr FROM digital_cards WHERE company_id = '{var1}' AND deleted_at IS NULL`,
    Q30: `UPDATE super_admin SET name = '{var1}', email = '{var2}' WHERE id = '{var3}' AND deleted_at IS NULL RETURNING *`,
    Q31: `SELECT dc.*,
          c.company_name,c.company_email,c.company_address,c.company_logo,c.company_contact_number,c.company_website,c.location, 
          usm.facebook, usm.instagram, usm.extra_link_title, usm.extra_link_url, usm.whatsapp,usm.we_chat,usm.linkedin, usm.twitter,usm.weibo, usm.xiao_hong_shu,usm.telegram,usm.youtube, usm.tiktok, usm.line
        FROM digital_cards dc
          LEFT JOIN company c on c.id = dc.company_id 
          LEFT JOIN user_media_link usm ON usm.digital_card_id = dc.id
        WHERE dc.id = '{var1}' AND dc.is_deactivated = '{var2}' 
          AND dc.deleted_at IS NULL AND c.deleted_at IS NULL AND c.status = 'activated'`,
    Q32: `UPDATE super_admin SET avatar = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
    Q33: `UPDATE digital_cards SET deleted_at = '{var1}' WHERE id = '{var2}' AND created_by = '{var3}' AND deleted_at IS NULL RETURNING *`,
    Q34: `SELECT * FROM digital_cards WHERE user_email = '{var1}' AND deleted_at IS NULL AND is_deactivated = false`
};

const db_sql_ca = {
    Q1: `SELECT * FROM company_admin WHERE email = '{var1}' AND deleted_at IS NULL`,
    Q2: `SELECT id, first_name, last_name, email, phone_number, mobile_number, company_id, created_by, role, is_active, avatar, created_at, updated_at, deleted_at, company_name FROM company_admin WHERE id = '{var1}' AND deleted_at IS NULL`,
    Q3: `SELECT * FROM company_admin WHERE id = '{var1}' AND deleted_at IS NULL AND is_active = true`,
    Q4: `UPDATE company_admin SET password = '{var2}' WHERE id = '{var1}' AND deleted_at IS NULL RETURNING *`,
    Q5: `UPDATE company_admin SET first_name = '{var2}', last_name = '{var3}', email = '{var4}', phone_number = '{var5}', mobile_number = '{var6}', avatar = '{var7}' WHERE id = '{var1}' AND deleted_at IS NULL RETURNING *`,
};

function dbScript(template, variables) {
    if (variables != null && Object.keys(variables).length > 0) {
        template = template.replace(
            new RegExp("{([^{]+)}", "g"),
            (_unused, varName) => {
                return variables[varName];
            }
        );
    }
    template = template.replace(/'null'/g, null);
    return template;
}

module.exports = { db_sql, dbScript, db_sql_ca };
