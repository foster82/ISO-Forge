import ldap from 'ldapjs';

export interface LdapConfig {
  url: string;
  baseDn: string;
  bindDn?: string;
  bindPw?: string;
  filter: string; // e.g. (uid={{username}})
}

export interface LdapUser {
  id: string;
  name: string;
  username: string;
  email: string;
  authSource: 'LDAP';
  groups: string[];
}

export async function testLDAP(config: LdapConfig): Promise<{ success: boolean; message: string }> {
  const client = ldap.createClient({ url: config.url });
  
  return new Promise((resolve) => {
    client.bind(config.bindDn || '', config.bindPw || '', (err) => {
      if (err) {
        client.unbind();
        return resolve({ success: false, message: `Bind failed: ${err.message}` });
      }

      // Try a basic search to verify permissions
      client.search(config.baseDn, { filter: '(objectClass=*)', scope: 'base' }, (err, res) => {
        if (err) {
          client.unbind();
          return resolve({ success: false, message: `Search failed: ${err.message}` });
        }
        
        let found = false;
        res.on('searchEntry', () => { found = true; });
        res.on('end', () => {
          client.unbind();
          if (found) resolve({ success: true, message: 'Connection successful!' });
          else resolve({ success: false, message: 'Connection established but Base DN search returned no results.' });
        });
        res.on('error', (err) => {
          client.unbind();
          resolve({ success: false, message: `Search error: ${err.message}` });
        });
      });
    });
  });
}

async function getLDAPGroups(client: ldap.Client, userDn: string, baseDn: string): Promise<string[]> {
  return new Promise((resolve) => {
    const groups: string[] = [];
    const opts = {
      filter: `(|(member=${userDn})(uniqueMember=${userDn}))`, // Support common group member attributes
      scope: 'sub' as const,
      attributes: ['cn', 'dn']
    };

    client.search(baseDn, opts, (err, res) => {
      if (err) return resolve([]);

      res.on('searchEntry', (entry) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const group = (entry as any).object as { cn?: string, dn: string };
        groups.push(group.cn || group.dn);
      });

      res.on('end', () => resolve(groups));
      res.on('error', () => resolve(groups));
    });
  });
}

export async function authenticateLDAP(username: string, password: string, config: LdapConfig): Promise<LdapUser | null> {
  const client = ldap.createClient({
    url: config.url,
  });

  return new Promise((resolve) => {
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
          attributes: ['dn', 'cn', 'mail', 'displayName', 'memberOf']
        };

        client.search(config.baseDn, opts, (err, res) => {
          if (err) {
            client.unbind();
            return resolve(null);
          }

          let found = false;
          res.on('searchEntry', async (entry) => {
            found = true;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const user = (entry as any).object as { 
              dn: string, 
              displayName?: string, 
              cn?: string, 
              mail?: string,
              memberOf?: string | string[] 
            };
            
            // 1. Extract groups from memberOf attribute (common in AD)
            const memberOfGroups: string[] = [];
            if (user.memberOf) {
              const rawGroups = Array.isArray(user.memberOf) ? user.memberOf : [user.memberOf];
              rawGroups.forEach(groupDn => {
                // Extract CN from DN (e.g. "CN=Admins,OU=Groups,DC=example,DC=com" -> "Admins")
                const match = groupDn.match(/CN=([^,]+)/i);
                if (match && match[1]) {
                  memberOfGroups.push(match[1]);
                } else {
                  memberOfGroups.push(groupDn); // Fallback to full DN
                }
              });
            }

            // 2. Get user groups via search (common in OpenLDAP)
            const searchedGroups = await getLDAPGroups(client, user.dn, config.baseDn);
            
            // 3. Merge and deduplicate
            const allGroups = Array.from(new Set([...memberOfGroups, ...searchedGroups]));
            
            client.unbind();
            resolve({
              id: user.dn,
              name: (user.displayName || user.cn || username) as string,
              username: username,
              email: (user.mail || '') as string,
              authSource: 'LDAP',
              groups: allGroups
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

          let entryFound = false;
          res.on('searchEntry', (entry) => {
            entryFound = true;
            bindAndSearch(entry.objectName as string);
          });

          res.on('end', () => {
            if (!entryFound) {
              client.unbind();
              resolve(null);
            }
          });
        });
      });
    } else {
      bindAndSearch(username);
    }
  });
}
