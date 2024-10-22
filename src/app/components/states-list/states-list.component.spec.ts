import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatesListComponent } from './states-list.component';

describe('StatesListComponent', () => {
  let component: StatesListComponent;
  let fixture: ComponentFixture<StatesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatesListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
