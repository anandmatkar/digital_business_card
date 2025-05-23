const { mysql_real_escape_string } = require("./helpers");

const db_sql = {
  Q0: `SELECT id,name,email,password,avatar FROM super_admin WHERE  deleted_at IS NULL`,
  Q1: `SELECT id,name,email,password,avatar FROM super_admin WHERE email = '{var1}' AND deleted_at IS NULL`,
  Q2: `INSERT INTO super_admin (name,email,password,avatar) VALUES ('{var1}', '{var2}', '{var3}','{var4}') RETURNING *;`,
  Q3: `SELECT id,name,email,avatar FROM super_admin WHERE id = '{var1}' AND deleted_at IS NULL`,
  Q4: `UPDATE super_admin SET password = '{var1}' ,updated_at = '{var2}' WHERE id = '{var3}' AND deleted_at IS NULL RETURNING *`,
  Q5: `SELECT * FROM company WHERE company_name = '{var1}' OR company_email = '{var2}' AND deleted_at IS NULL`,
  Q6: `INSERT INTO company (company_name,company_email,company_contact_number, max_cards, contact_person_name,contact_person_email, company_logo, cover_pic, trial_start_date, trial_end_date,is_default_address,is_main_company) VALUES('{var1}','{var2}','{var3}','{var4}','{var5}','{var6}', '{var7}', '{var8}', '{var9}', '{var10}','{var11}','{var12}') RETURNING *`,
  Q7: `SELECT * FROM company WHERE deleted_at IS NULL AND status = '{var1}' ORDER BY created_at DESC;`,
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
                c.cover_pic,
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
                c.product_service,
                c.cover_pic,
                c.location, 
                c.latitude, 
                c.longitude, 
                c.trial_start_date,
                c.trial_end_date,
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
                c.admin_id = '{var1}' AND c.is_main_company = 'true'
                AND c.deleted_at IS NULL
            GROUP BY 
                c.id;`,
  Q17: `INSERT INTO digital_cards (company_id, created_by, card_reference, first_name, last_name,user_email, designation,bio,qr_url, user_type,cover_pic,profile_picture,card_url,vcf_card_url,company_ref, contact_number ) VALUES('{var1}','{var2}','{var3}','{var4}','{var5}','{var6}','{var7}','{var8}','{var9}','{var10}','{var11}','{var12}','{var13}','{var14}', '{var15}','{var16}') RETURNING *`,
  Q18: `INSERT INTO user_media_link (facebook, instagram, extra_link_title, extra_link_url,linkedin,twitter,telegram,whatsapp, youtube,tiktok,line,we_chat,xiao_hong_shu,weibo, company_id) VALUES('{var1}','{var2}','{var3}','{var4}','{var5}','{var6}','{var7}','{var8}','{var9}','{var10}','{var11}','{var12}','{var13}','{var14}','{var15}') RETURNING *`,
  Q19: `SELECT dc.*,
          c.company_name,c.company_email,c.company_address,c.company_logo,c.company_contact_number,c.company_website,c.location, c.product_service,c.cover_pic,c.trial_start_date, c.trial_end_date,
          usm.facebook, usm.instagram, usm.extra_link_title, usm.extra_link_url, usm.whatsapp, usm.weibo, usm.xiao_hong_shu, usm.linkedin, usm.twitter, usm.telegram, usm.youtube, usm.tiktok, usm.line, usm.we_chat,usm.official_website
        FROM digital_cards dc
          LEFT JOIN company c on c.id = dc.associated_company 
          LEFT JOIN user_media_link usm ON usm.company_id = c.id
        WHERE dc.company_ref = '{var1}' AND dc.card_reference = '{var2}' AND dc.is_deactivated = '{var3}' 
          AND dc.deleted_at IS NULL AND c.deleted_at IS NULL AND c.status = 'activated'`,
  Q20: `UPDATE company SET used_cards = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q21: `UPDATE digital_cards SET is_active_for_qr = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q22: `UPDATE digital_cards SET is_deactivated = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q23: `SELECT id,company_id,created_by,card_reference,first_name,last_name,user_email,designation,bio,user_type,cover_pic,profile_picture,is_deactivated, card_url,company_ref,contact_number,associated_company, qr_url FROM digital_cards WHERE created_by = '{var1}' AND deleted_at IS NULL ORDER BY created_at DESC;`,
  Q24: `UPDATE digital_cards SET is_active_for_qr = '{var1}' WHERE id IN ('{var2}') AND deleted_at IS NULL RETURNING *`,
  Q25: `SELECT id,company_id,created_by,card_reference,first_name,last_name,user_email,designation,bio,user_type,cover_pic,profile_picture,is_deactivated, card_url,company_ref,contact_number,is_active_for_qr FROM digital_cards WHERE id = '{var1}' AND deleted_at IS NULL`,
  Q26: `UPDATE digital_cards SET first_name = '{var1}', last_name = '{var2}',user_email = '{var3}',designation = '{var4}',profile_picture = '{var5}', bio = '{var6}', cover_pic = '{var7}', contact_number = '{var8}' WHERE id = '{var9}' AND deleted_at IS NULL RETURNING *`,
  Q27: `UPDATE company SET company_name = '{var1}', company_email = '{var2}',description = '{var3}', company_address = '{var4}', company_logo = '{var5}', company_website = '{var6}', location = '{var7}', latitude = '{var8}', longitude = '{var9}', company_contact_number = '{var10}', product_service = '{var11}' WHERE admin_id = '{var12}' AND id = '{var13}' AND deleted_at IS NULL RETURNING *`,
  Q28: `UPDATE company_admin SET first_name = '{var1}' , last_name = '{var2}', email = '{var3}', phone_number = '{var4}' WHERE id = '{var5}' AND deleted_at IS NULL RETURNING *`,
  Q29: `SELECT id,company_id,created_by,card_reference,first_name,last_name,user_email,designation,bio,user_type,cover_pic,profile_picture,is_deactivated, card_url,company_ref,contact_number,is_active_for_qr FROM digital_cards WHERE company_id = '{var1}' AND deleted_at IS NULL ORDER BY created_at DESC;`,
  Q30: `UPDATE super_admin SET name = '{var1}', email = '{var2}', avatar = '{var3}' WHERE id = '{var4}' AND deleted_at IS NULL RETURNING *`,
  Q31: `SELECT dc.*,
          c.company_name,c.company_email,c.company_address,c.company_logo,c.company_contact_number,c.company_website,c.location,c.cover_pic, 
          usm.facebook, usm.instagram, usm.extra_link_title, usm.extra_link_url, usm.whatsapp,usm.we_chat,usm.linkedin, usm.twitter,usm.weibo, usm.xiao_hong_shu,usm.telegram,usm.youtube, usm.tiktok, usm.line
        FROM digital_cards dc
          LEFT JOIN company c on c.id = dc.company_id 
          LEFT JOIN user_media_link usm ON usm.digital_card_id = dc.id
        WHERE dc.id = '{var1}' AND dc.is_deactivated = '{var2}' 
          AND dc.deleted_at IS NULL AND c.deleted_at IS NULL AND c.status = 'activated'`,
  Q32: `UPDATE super_admin SET avatar = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q33: `UPDATE digital_cards SET deleted_at = '{var1}' WHERE id = '{var2}' AND created_by = '{var3}' AND deleted_at IS NULL RETURNING *`,
  Q34: `SELECT * FROM digital_cards WHERE user_email = '{var1}' AND deleted_at IS NULL AND is_deactivated = false`,
  Q35: `SELECT id,first_name, last_name,qr_url,card_url FROM digital_cards WHERE created_by = '{var1}' AND deleted_at IS NULL AND is_deactivated = '{var2}'`,
  Q36: `SELECT * FROM super_admin WHERE email = '{var1}' AND deleted_at IS NULL`,
  Q37: `SELECT * FROM super_admin WHERE id = '{var1}' AND deleted_at IS NULL`,
  Q38: `UPDATE super_admin SET password = '{var2}' WHERE id = '{var1}' AND deleted_at IS NULL RETURNING *`,
  Q39: `WITH updated_card AS (
            UPDATE digital_cards
            SET 
              first_name = '{var1}',
              last_name = '{var2}',
              user_email = '{var3}',
              designation = '{var4}',
              profile_picture = '{var5}',
              bio = '{var6}',
              cover_pic = '{var7}',
              contact_number = '{var8}'
            WHERE
              id = '{var9}' 
              AND deleted_at IS NULL
            RETURNING *
          )
          UPDATE user_media_link AS uml
          SET 
            facebook = '{var10}',
            instagram = '{var11}',
            whatsapp = '{var12}',
            twitter = '{var13}',
            telegram = '{var14}',
            we_chat = '{var15}',
            line = '{var16}',
            youtube = '{var17}',
            tiktok = '{var18}',
            xiao_hong_shu = '{var19}',
            linkedin = '{var20}',
            weibo = '{var21}'
          FROM updated_card
          WHERE uml.digital_card_id = updated_card.id
          RETURNING updated_card.id AS card_id,
                    updated_card.first_name,
                    updated_card.last_name,
                    updated_card.user_email,
                    updated_card.designation,
                    updated_card.profile_picture AS card_profile_picture,
                    updated_card.bio AS card_bio,
                    updated_card.cover_pic AS card_cover_pic,
                    updated_card.contact_number,
                    uml.*`,
  Q40: `SELECT facebook,instagram,twitter,youtube,we_chat,line,telegram,linkedin,xiao_hong_shu, weibo,tiktok,official_website, company_id FROM user_media_link WHERE company_id = '{var1}' AND deleted_at IS NULL`,
  Q41: `UPDATE user_media_link SET facebook = '{var1}', instagram = '{var2}', twitter = '{var3}', youtube = '{var4}', linkedin = '{var5}',xiao_hong_shu = '{var6}',tiktok = '{var7}',we_chat = '{var8}',line = '{var9}', telegram = '{var10}', weibo = '{var11}', official_website = '{var13}' WHERE company_id = '{var12}' AND deleted_at IS NULL RETURNING *`,
  Q42: `SELECT first_name,last_name,user_email,designation,profile_picture,card_url,qr_url FROM digital_cards WHERE created_by = '{var1}' AND deleted_at IS NULL`,
  Q43: `UPDATE company SET deleted_at = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q44: `UPDATE company_admin SET deleted_at = '{var1}' WHERE company_id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q45: `SELECT * FROM company WHERE admin_id = '{var1}' AND deleted_at IS NULL ORDER BY is_default_address desc`,
  Q46: `UPDATE company SET is_default_address = '{var1}' WHERE admin_id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q47: `UPDATE company SET is_default_address = '{var1}' WHERE id = '{var2}' AND admin_id = '{var3}' AND deleted_at IS NULL RETURNING *`,
  Q48: `UPDATE company SET used_cards = '{var1}' WHERE admin_id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q49: `SELECT * FROM digital_cards WHERE associated_company = '{var1}' AND deleted_at IS NULL`,
  Q50: `DELETE FROM company 
WHERE id = '{var1}' 
  AND admin_id = '{var2}' 
  AND deleted_at IS NULL 
  AND is_main_company = false 
RETURNING *`,
  Q51: `DELETE FROM user_media_link WHERE company_id = '{var1}' AND deleted_at IS NULL RETURNING *`,
  Q52: `UPDATE company SET company_logo = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q53: `UPDATE company SET cover_pic = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q54: `UPDATE company_admin SET avatar = '{var1}' WHERE id = '{var2}' AND deleted_at IS NULL RETURNING *`,
  Q55: `SELECT 
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
                c.product_service,
                c.cover_pic,
                c.location, 
                c.latitude, 
                c.longitude, 
                c.trial_start_date,
                c.trial_end_date,
                c.created_at, 
                c.updated_at, 
                c.deleted_at
                FROM company as c
            WHERE 
                 c.id = '{var1}'AND c.deleted_at IS NULL`,
  Q56: `SELECT * FROM company WHERE id = '{var1}' AND deleted_at IS NULL`,
  Q57: `UPDATE company SET trial_start_date = '{var1}', trial_end_date = '{var2}' WHERE admin_id = '{var3}' AND deleted_at IS NULL RETURNING *`
};

const db_sql_ca = {
  Q1: `SELECT * FROM company_admin WHERE email = '{var1}' AND deleted_at IS NULL`,
  Q2: `SELECT id, first_name, last_name, email, phone_number, mobile_number, company_id, created_by, role, is_active, avatar, created_at, updated_at, deleted_at, company_name FROM company_admin WHERE id = '{var1}' AND deleted_at IS NULL`,
  Q3: `SELECT * FROM company_admin WHERE id = '{var1}' AND deleted_at IS NULL AND is_active = true`,
  Q4: `UPDATE company_admin SET password = '{var2}' WHERE id = '{var1}' AND deleted_at IS NULL RETURNING *`,
  Q5: `UPDATE company_admin SET first_name = '{var2}', last_name = '{var3}', email = '{var4}', phone_number = '{var5}', mobile_number = '{var6}', avatar = '{var7}' WHERE id = '{var1}' AND deleted_at IS NULL RETURNING *`,
  Q6: `SELECT 
  ca.*,
  json_agg(c) AS company_data
FROM 
  company_admin ca
  LEFT JOIN company c ON ca.company_id = c.id
WHERE 
  ca.email = '{var1}' AND ca.deleted_at IS NULL
GROUP BY 
  ca.id;`
};

// function dbScript(template, variables) {
//   if (variables != null && Object.keys(variables).length > 0) {
//     template = template.replace(
//       new RegExp("{([^{]+)}", "g"),
//       (_unused, varName) => {
//         return variables[varName];
//       }
//     );
//   }
//   template = template.replace(/'null'/g, null);
//   return template;
// }

function dbScript(template, variables) {
  if (variables != null && Object.keys(variables).length > 0) {
    template = template.replace(new RegExp("\{([^\{]+)\}", "g"), (_unused, varName) => {
      return variables[varName];
    });
  }
  template = template.replace(/'null'/g, null);
  return template
}



module.exports = { db_sql, dbScript, db_sql_ca };
