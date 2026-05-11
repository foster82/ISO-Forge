import { describe, it, expect, vi } from 'vitest'
import { BuildEngine, BuildOptions } from './build-engine'

describe('BuildEngine', () => {
  const defaultOptions: BuildOptions = {
    baseIsoPath: '/tmp/base.iso',
    imageType: 'ISO',
    outputPath: '/tmp/output.iso',
    hostname: 'test-host',
    username: 'test-user',
    passwordHash: 'hashed-password',
    packages: ['vim', 'git'],
    onLog: vi.fn(),
  }

  describe('generateUserData', () => {
    describe('ISO format', () => {
      it('generates correct autoinstall cloud-config', () => {
        const userData = BuildEngine.generateUserData({ ...defaultOptions, imageType: 'ISO' })
        
        expect(userData).toContain('#cloud-config')
        expect(userData).toContain('autoinstall:')
        expect(userData).toContain('hostname: test-host')
        expect(userData).toContain('username: test-user')
        expect(userData).toContain('password: "hashed-password"')
      })

      it('includes nested packages for ISO', () => {
        const userData = BuildEngine.generateUserData({ ...defaultOptions, imageType: 'ISO' })
        
        expect(userData).toContain('    packages:')
        expect(userData).toContain('      - vim')
      })
    })

    describe('Cloud Image format', () => {
      it('generates correct standard cloud-config', () => {
        const userData = BuildEngine.generateUserData({ ...defaultOptions, imageType: 'CLOUD_IMAGE' })
        
        expect(userData).toContain('#cloud-config')
        expect(userData).not.toContain('autoinstall:')
        expect(userData).toContain('hostname: test-host')
        expect(userData).toContain('name: test-user')
        expect(userData).toContain('passwd: "hashed-password"')
      })

      it('includes top-level packages for Cloud Image', () => {
        const userData = BuildEngine.generateUserData({ ...defaultOptions, imageType: 'CLOUD_IMAGE' })
        
        expect(userData).toContain('\npackages:')
        expect(userData).toContain('  - vim')
      })
    })

    describe('Common functionality', () => {
      it('includes ssh keys if provided', () => {
        const userData = BuildEngine.generateUserData({ 
          ...defaultOptions, 
          sshKey: 'ssh-rsa AAA...' 
        })
        
        expect(userData).toContain('ssh_authorized_keys:')
        expect(userData).toContain('ssh-rsa AAA...')
      })

      it('configures network if ipAddress is provided', () => {
        const userData = BuildEngine.generateUserData({ 
          ...defaultOptions, 
          ipAddress: '192.168.1.10/24',
          gateway: '192.168.1.1',
          dnsServers: ['8.8.8.8', '1.1.1.1']
        })
        
        expect(userData).toContain('network:')
        expect(userData).toContain('addresses:')
        expect(userData).toContain('- 192.168.1.10/24')
        expect(userData).toContain('gateway4: 192.168.1.1')
        expect(userData).toContain('8.8.8.8, 1.1.1.1')
      })
    })
  })
})
