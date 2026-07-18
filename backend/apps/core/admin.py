from django.contrib import admin
from .models import MilitaryBase, NetworkTraffic, ThreatDetection, FederatedModelRound, ClientMetrics

admin.site.register(MilitaryBase)
admin.site.register(NetworkTraffic)
admin.site.register(ThreatDetection)
admin.site.register(FederatedModelRound)
admin.site.register(ClientMetrics)
from django.contrib import admin

# Register your models here.
