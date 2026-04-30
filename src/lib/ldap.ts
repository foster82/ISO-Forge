import ldap from 'ldapjs';

export interface LdapConfig {
  url: string;
  baseDn: string;
  bindDn?: string;
  bindPw?: string;
  filter: string; // e.g. (uid={{username}})
}

export async function authenticateLDAP(username: string, password: string, config: LdapConfig) {
  const client = ldap.createClient({
    url: config.url,
  });

  return new Promise((resolve, reject) => {
    const bindAndSearch = (userDn: string) => {
      client.bind(userDn, password, (err) => {
        if (err) {
          client.unbind();
          return resolve(null);
        }

        // Search for user details
        const searchFilter = config.filter.replace('{{username}}', username);
        const opts = {
          filter: searchFilter,
          scope: 'sub' as const,
          attributes: ['dn', 'cn', 'mail', 'displayName']
        };

        client.search(config.baseDn, opts, (err, res) => {
          if (err) {
            client.unbind();
            return resolve(null);
          }

          let found = false;
          res.on('searchEntry', (entry) => {
            found = true;
            const user = entry.object;
            client.unbind();
            resolve({
              id: user.dn as string,
              name: (user.displayName || user.cn || username) as string,
              username: username,
              email: user.mail as string,
              authSource: 'LDAP'
            });
          });

          res.on('error', () => {
            client.unbind();
            resolve(null);
          });

          res.on('end', () => {
            if (!found) {
              client.unbind();
              resolve(null);
            }
          });
        });
      });
    };

    // If we have a bind DN, use it to search for the user DN first
    if (config.bindDn && config.bindPw) {
      client.bind(config.bindDn, config.bindPw, (err) => {
        if (err) {
          client.unbind();
          return resolve(null);
        }

        const searchFilter = config.filter.replace('{{username}}', username);
        client.search(config.baseDn, { filter: searchFilter, scope: 'sub' }, (err, res) => {
          if (err) {
            client.unbind();
            return resolve(null);
          }

          res.on('searchEntry', (entry) => {
            bindAndSearch(entry.objectName);
          });

          res.on('end', () => {
            // If not found yet, bindAndSearch wasn't called
          });
        });
      });
    } else {
      // Direct bind attempt (guessing the DN pattern if possible, or just using username)
      // This varies wildly by LDAP server, often userDn is needed.
      // For now, assume username is the DN or can be used directly for bind if it's UPN style
      bindAndSearch(username);
    }
  });
}
