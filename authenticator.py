from pprint import pprint

from twisted.internet.defer import inlineCallbacks

from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

PRINCIPALS_FILE = '../principals.txt'
PRINCIPALS_DB = dict()
with open(PRINCIPALS_FILE, 'r') as fh:
   for line in fh:
      principal, ticket, role = line.strip().split(' ')
      PRINCIPALS_DB[principal] = {
         'ticket': ticket,
         'role': role
      }

class Authenticator(ApplicationSession):

   @inlineCallbacks
   def onJoin(self, details):
      def authenticate(realm, authid, details):
         ticket = details['ticket']

         protocol, host, port = details['transport']['peer'].split(':')
         print('Client:', protocol, host, port)

         if authid in PRINCIPALS_DB:
            if ticket == PRINCIPALS_DB[authid]['ticket']:
               return PRINCIPALS_DB[authid]['role']
            else:
               raise ApplicationError('invalid_ticket',
                     'could not authenticate session - invalid '
                     'ticket "{}" for principal {}'.format(ticket, authid))
         else:
            raise ApplicationError('no_such_user',
                  'no such principal {}'.format(authid))
      try:
         yield self.register(authenticate, 'com.forrestli.jukebox.authenticate')
      except Exception as e:
         print('Failed to register dynamic authenticator: {0}'.format(e))
